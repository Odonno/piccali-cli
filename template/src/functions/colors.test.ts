// @vitest-environment jsdom
import { describe, expect, test, vi, afterEach } from "vitest";
import { isHexColor, getSystemLabel } from "./colors";

describe("isHexColor", () => {
	test("accepts 3-digit hex", () => {
		expect(isHexColor("#abc")).toBe(true);
	});

	test("accepts 6-digit hex", () => {
		expect(isHexColor("#1a2b3c")).toBe(true);
	});

	test("accepts 8-digit hex (with alpha)", () => {
		expect(isHexColor("#1a2b3cff")).toBe(true);
	});

	test("accepts uppercase hex", () => {
		expect(isHexColor("#AABBCC")).toBe(true);
	});

	test("accepts mixed case hex", () => {
		expect(isHexColor("#aAbBcC")).toBe(true);
	});

	test("accepts value with surrounding whitespace", () => {
		expect(isHexColor("  #abc  ")).toBe(true);
	});

	test("rejects missing hash prefix", () => {
		expect(isHexColor("abc")).toBe(false);
	});

	test("rejects empty string", () => {
		expect(isHexColor("")).toBe(false);
	});

	test("rejects too short (2-digit)", () => {
		expect(isHexColor("#ab")).toBe(false);
	});

	test("rejects too long (9-digit)", () => {
		expect(isHexColor("#abcdef123")).toBe(false);
	});

	test("rejects invalid characters", () => {
		expect(isHexColor("#xyz")).toBe(false);
	});

	test("rejects hash only", () => {
		expect(isHexColor("#")).toBe(false);
	});
});

describe("getSystemLabel", () => {
	const mockMatchMedia = (matches: boolean) => {
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockReturnValue({ matches } as MediaQueryList),
		});
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("returns dark label when system prefers dark", () => {
		mockMatchMedia(true);

		expect(getSystemLabel()).toBe("System (dark)");
	});

	test("returns light label when system prefers light", () => {
		mockMatchMedia(false);

		expect(getSystemLabel()).toBe("System (light)");
	});
});
