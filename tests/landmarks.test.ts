import { describe, expect, it } from "vitest";
import { sceneFor } from "@/lib/landmarks";

describe("landmark scene", () => {
  it("uses the city's own landmark when nearby", () => {
    expect(sceneFor(28.65, 77.23).landmark?.name).toBe("India Gate");
    expect(sceneFor(26.92, 75.82).landmark?.name).toBe("Hawa Mahal");
  });

  it("covers many more cities, in India and abroad", () => {
    expect(sceneFor(24.58, 73.71).landmark?.name).toBe("City Palace"); // Udaipur
    expect(sceneFor(19.81, 85.83).landmark?.name).toBe("Jagannath Temple"); // Puri
    expect(sceneFor(25.2, 55.27).landmark?.name).toBe("Burj Khalifa"); // Dubai
  });

  it("never borrows a landmark from a neighbouring city", () => {
    expect(sceneFor(28.41, 77.32, "Faridabad").scope).toBe("none"); // 25 km from India Gate → local lookup instead
    expect(sceneFor(28.54, 77.39, "Noida").scope).toBe("none");
    expect(sceneFor(27.6, 72.2, "Some desert town").scope).toBe("none");
  });

  it("still finds a big city's landmark from its centre, including alternative spellings", () => {
    expect(sceneFor(19.076, 72.8777, "Mumbai").landmark?.name).toBe("Gateway of India"); // ~17 km, same city
    expect(sceneFor(19.076, 72.8777).scope).toBe("none"); // without the city name it is too far to assume
    expect(sceneFor(12.9716, 77.5946, "Bangalore").landmark?.name).toBe("Vidhana Soudha");
    expect(sceneFor(28.6139, 77.209, "New Delhi").landmark?.name).toBe("India Gate");
  });

  it("shows the location itself when nothing matches", () => {
    const s = sceneFor(-33.9, 18.4, "Western Cape");
    expect(s.scope).toBe("none");
    expect(s.landmark).toBeUndefined();
  });
});
