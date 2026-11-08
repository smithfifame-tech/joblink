import { BENIN_CITIES } from "@/lib/maps/places";

export function CityDatalist() {
  return (
    <datalist id="jl-cities">
      {BENIN_CITIES.map((c) => (
        <option key={c.name} value={c.name} />
      ))}
    </datalist>
  );
}
