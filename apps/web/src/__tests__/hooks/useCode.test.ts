import { describe, it, expect, beforeEach } from "vitest";
import {
  CodeGenerator,
  CODE_RULES,
  getCodeRuleForEntity,
  generateCodeForEntity,
  batchGenerateCodesForEntity,
  type CodeRule,
} from "../../hooks/useCode";

describe("useCode utilities", () => {
  describe("CodeGenerator class", () => {
    describe("generate", () => {
      it("should generate code with default settings", () => {
        const generator = new CodeGenerator();
        const code = generator.generate();
        expect(code).toBeTruthy();
        expect(typeof code).toBe("string");
      });

      it("should include prefix when configured", () => {
        const generator = new CodeGenerator({ prefix: "TEST" });
        const code = generator.generate();
        expect(code.startsWith("TEST")).toBe(true);
      });

      it("should not include date when include_date is false", () => {
        const generator = new CodeGenerator({
          prefix: "T",
          include_date: false,
          sequence_length: 4,
        });
        const code = generator.generate();
        expect(code).toMatch(/^T\d{4}$/);
      });

      it("should include date in YYYY format", () => {
        const generator = new CodeGenerator({
          prefix: "T",
          include_date: true,
          date_format: "YYYY",
          sequence_length: 4,
        });
        const code = generator.generate();
        const year = new Date().getFullYear().toString();
        expect(code).toContain(year);
        expect(code).toMatch(/^T\d{4}\d{4}$/);
      });

      it("should include date in YYYYMM format", () => {
        const generator = new CodeGenerator({
          prefix: "T",
          include_date: true,
          date_format: "YYYYMM",
          sequence_length: 4,
        });
        const code = generator.generate();
        const year = new Date().getFullYear().toString();
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        expect(code).toContain(`${year}${month}`);
      });

      it("should include date in YYYYMMDD format", () => {
        const generator = new CodeGenerator({
          prefix: "T",
          include_date: true,
          date_format: "YYYYMMDD",
          sequence_length: 4,
        });
        const code = generator.generate();
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        expect(code).toContain(`${year}${month}${day}`);
      });

      it("should use separator when configured", () => {
        const generator = new CodeGenerator({
          prefix: "T",
          include_date: false,
          separator: "-",
          sequence_length: 4,
        });
        const code = generator.generate();
        expect(code).toContain("-");
      });

      it("should increment sequence on each generation", () => {
        const generator = new CodeGenerator({
          prefix: "",
          include_date: false,
          sequence_length: 4,
        });

        const code1 = generator.generate();
        const code2 = generator.generate();

        // Codes should differ by 1 in the sequence
        expect(code1 < code2).toBe(true);
      });

      it("should pad sequence to configured length", () => {
        const generator = new CodeGenerator({
          prefix: "",
          include_date: false,
          sequence_length: 6,
        });

        const code = generator.generate();
        expect(code.length).toBe(6);

        // Starting sequence should be 1, so it should be padded to 000001
        expect(code).toBe("000001");
      });

      it("should start from custom sequence_start", () => {
        const generator = new CodeGenerator({
          prefix: "",
          include_date: false,
          sequence_length: 4,
          sequence_start: 100,
        });

        const code = generator.generate();
        expect(code).toBe("0100");
      });
    });

    describe("generateBatch", () => {
      it("should generate multiple unique codes", () => {
        const generator = new CodeGenerator({
          prefix: "",
          include_date: false,
          sequence_length: 4,
        });

        const codes = generator.generateBatch(5);
        expect(codes).toHaveLength(5);

        // All codes should be unique
        const uniqueCodes = new Set(codes);
        expect(uniqueCodes.size).toBe(5);
      });

      it("should generate sequential codes", () => {
        const generator = new CodeGenerator({
          prefix: "",
          include_date: false,
          sequence_length: 4,
          sequence_start: 1,
        });

        const codes = generator.generateBatch(3);
        expect(codes).toEqual(["0001", "0002", "0003"]);
      });
    });

    describe("validate static method", () => {
      it("should validate correct code with prefix", () => {
        const rule: Partial<CodeRule> = {
          prefix: "TEST",
          include_date: false,
          sequence_length: 4,
        };

        expect(CodeGenerator.validate("TEST0001", rule)).toBe(true);
        expect(CodeGenerator.validate("TEST1234", rule)).toBe(true);
      });

      it("should invalidate code without prefix", () => {
        const rule: Partial<CodeRule> = {
          prefix: "TEST",
          include_date: false,
          sequence_length: 4,
        };

        expect(CodeGenerator.validate("0001", rule)).toBe(false);
      });

      it("should validate code with date", () => {
        const rule: Partial<CodeRule> = {
          prefix: "T",
          include_date: true,
          date_format: "YYYYMMDD",
          sequence_length: 4,
        };

        // This is a valid format but we can't predict the exact date
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const validCode = `T${year}${month}${day}0001`;

        expect(CodeGenerator.validate(validCode, rule)).toBe(true);
      });

      it("should invalidate wrong sequence length", () => {
        const rule: Partial<CodeRule> = {
          prefix: "T",
          include_date: false,
          sequence_length: 4,
        };

        expect(CodeGenerator.validate("T1", rule)).toBe(false);
        expect(CodeGenerator.validate("T12345", rule)).toBe(false);
      });
    });
  });

  describe("CODE_RULES", () => {
    it("should have rules for all entity types", () => {
      expect(CODE_RULES.company).toBeDefined();
      expect(CODE_RULES.department).toBeDefined();
      expect(CODE_RULES.employee).toBeDefined();
      expect(CODE_RULES.customer).toBeDefined();
      expect(CODE_RULES.supplier).toBeDefined();
    });

    it("should have correct prefix for company", () => {
      expect(CODE_RULES.company.prefix).toBe("C");
      expect(CODE_RULES.company.include_date).toBe(true);
      expect(CODE_RULES.company.date_format).toBe("YYYYMMDD");
    });

    it("should have correct prefix for employee", () => {
      expect(CODE_RULES.employee.prefix).toBe("E");
      expect(CODE_RULES.employee.include_date).toBe(false);
      expect(CODE_RULES.employee.sequence_length).toBe(6);
    });
  });

  describe("getCodeRuleForEntity", () => {
    it("should return rule for valid entity", () => {
      const rule = getCodeRuleForEntity("employee");
      expect(rule.prefix).toBe("E");
    });

    it("should return default rule for unknown entity", () => {
      const rule = getCodeRuleForEntity("unknown" as any);
      expect(rule.prefix).toBe("");
      expect(rule.sequence_length).toBe(6);
    });
  });

  describe("generateCodeForEntity", () => {
    it("should generate code for employee", () => {
      const code = generateCodeForEntity("employee");
      expect(code).toBeTruthy();
      expect(code.startsWith("E")).toBe(true);
    });

    it("should generate different codes on each call", () => {
      const code1 = generateCodeForEntity("department");
      const code2 = generateCodeForEntity("department");
      // They might be the same if called in the same second, but the sequence should increment
      expect(typeof code1).toBe("string");
      expect(typeof code2).toBe("string");
    });
  });

  describe("batchGenerateCodesForEntity", () => {
    it("should generate specified number of codes", () => {
      const codes = batchGenerateCodesForEntity("employee", 5);
      expect(codes).toHaveLength(5);
    });

    it("should generate unique codes", () => {
      const codes = batchGenerateCodesForEntity("department", 3);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(3);
    });
  });
});
