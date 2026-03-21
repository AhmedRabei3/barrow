declare module "world-countries" {
  interface Country {
    cca2: string;
    name: { common: string };
    flags: { svg: string; png: string };
    latlng: [number, number];
    region: string;
  }

  const countries: Country[];
  export default countries;
}
