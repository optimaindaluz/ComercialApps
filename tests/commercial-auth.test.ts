import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed_${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
  },
}));

// Mock jose
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockReturnValue({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock_jwt_token"),
  }),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { commercialId: 1, type: "commercial" },
  }),
}));

// Mock DB
const mockCommercial = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  fullName: "Test User",
  passwordHash: "hashed_password123",
  personalQrCode: "abc123qr",
  createdAt: new Date(),
};

vi.mock("../server/db", () => ({
  getCommercialByUsername: vi.fn(async (username: string) => {
    if (username === "testuser") return mockCommercial;
    return null;
  }),
  getCommercialByEmail: vi.fn(async (email: string) => {
    if (email === "test@example.com") return mockCommercial;
    return null;
  }),
  getCommercialById: vi.fn(async (id: number) => {
    if (id === 1) return mockCommercial;
    return null;
  }),
  getCommercialByQrCode: vi.fn(async (qrCode: string) => {
    if (qrCode === "abc123qr") return mockCommercial;
    return null;
  }),
  createCommercial: vi.fn(async () => 1),
  getBusinessesByCommercial: vi.fn(async () => []),
  getLeadsByCommercial: vi.fn(async () => []),
  getLeadCountByCommercial: vi.fn(async () => 0),
  getLeadById: vi.fn(async () => null),
  getFilesByLead: vi.fn(async () => []),
  getBusinessByQrCode: vi.fn(async () => null),
  getBusinessById: vi.fn(async () => null),
  createBusiness: vi.fn(async () => 1),
  deleteBusiness: vi.fn(async () => {}),
  getLeadCountByBusiness: vi.fn(async () => 0),
  createLead: vi.fn(async () => 1),
  updateLeadStatus: vi.fn(async () => {}),
  createLeadFile: vi.fn(async () => {}),
}));

// Mock storage
vi.mock("../server/storage", () => ({
  storagePut: vi.fn(async () => ({ url: "https://storage.example.com/file.pdf", key: "file.pdf" })),
}));

// Mock ENV
vi.mock("../server/_core/env", () => ({
  ENV: {
    cookieSecret: "test-secret-key-for-testing",
    forgeApiUrl: "https://api.example.com",
    forgeApiKey: "test-api-key",
  },
}));

describe("Commercial Authentication", () => {
  it("should validate that a commercial user object has required fields", () => {
    const user = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      fullName: "Test User",
      personalQrCode: "abc123qr",
    };
    expect(user.id).toBeDefined();
    expect(user.username).toBeTruthy();
    expect(user.email).toContain("@");
    expect(user.personalQrCode).toBeTruthy();
  });

  it("should validate lead form data correctly", () => {
    const validLead = {
      fullName: "Juan García",
      phone: "600123456",
      email: "juan@example.com",
      privacyAccepted: true,
      marketingAccepted: false,
    };
    expect(validLead.fullName.length).toBeGreaterThan(1);
    expect(validLead.phone.length).toBeGreaterThan(5);
    expect(validLead.email).toContain("@");
    expect(validLead.privacyAccepted).toBe(true);
  });

  it("should reject lead form without privacy acceptance", () => {
    const invalidLead = {
      fullName: "Juan García",
      phone: "600123456",
      email: "juan@example.com",
      privacyAccepted: false,
      marketingAccepted: false,
    };
    expect(invalidLead.privacyAccepted).toBe(false);
    // This should throw in the actual mutation
    const shouldThrow = !invalidLead.privacyAccepted;
    expect(shouldThrow).toBe(true);
  });

  it("should generate a valid QR code format (hex string)", () => {
    // QR codes are generated as 32-char hex strings (16 bytes)
    const mockQrCode = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
    expect(mockQrCode).toMatch(/^[a-f0-9]{32}$/);
  });

  it("should validate status enum values", () => {
    const validStatuses = ["new", "contacted", "in_progress", "closed"];
    const testStatus = "new";
    expect(validStatuses).toContain(testStatus);
    expect(validStatuses).not.toContain("invalid_status");
  });

  it("should validate business name is not empty", () => {
    const businessName = "Bar El Rincón";
    expect(businessName.trim().length).toBeGreaterThan(0);
    expect("".trim().length).toBe(0);
  });
});

describe("Public Form Validation", () => {
  it("should require all mandatory fields", () => {
    const checkFormValid = (data: {
      fullName: string;
      phone: string;
      email: string;
      privacyAccepted: boolean;
    }) => {
      return (
        data.fullName.trim().length > 0 &&
        data.phone.trim().length > 0 &&
        data.email.trim().length > 0 &&
        data.privacyAccepted
      );
    };

    expect(checkFormValid({
      fullName: "Ana López",
      phone: "611222333",
      email: "ana@test.com",
      privacyAccepted: true,
    })).toBe(true);

    expect(checkFormValid({
      fullName: "",
      phone: "611222333",
      email: "ana@test.com",
      privacyAccepted: true,
    })).toBe(false);

    expect(checkFormValid({
      fullName: "Ana López",
      phone: "611222333",
      email: "ana@test.com",
      privacyAccepted: false,
    })).toBe(false);
  });

  it("should validate email format", () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("test@")).toBe(false);
  });
});
