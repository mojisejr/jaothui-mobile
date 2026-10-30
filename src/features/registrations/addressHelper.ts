import { countryAndStates } from "./country-states";

const distinct = (value: string, index: number, self: string[]) => {
  return self.indexOf(value) === index;
};

export const getProvinces = () => {
  const provinces = countryAndStates.map((s) => s.province);
  return provinces.filter(distinct);
};

export const getAmphoeFromProvince = (province: string) => {
  if (!province) {
    return [];
  }
  const states = countryAndStates.filter((p) => p.province === province);
  const amphoe = states.map((a) => a.amphoe);
  return amphoe.filter(distinct);
};

export const getStatesFromAmphoe = (province: string) => {
  if (!province) {
    return [];
  }
  const states = countryAndStates.filter((p) => p.province === province);
  const amphoe = states.map((a) => a.amphoe);
  return amphoe.filter(distinct);
};

export const getDistrictsFromAmphoe = (province: string, amphoe: string) => {
  if (!amphoe || !province) {
    return [];
  }
  const amphoes = countryAndStates.filter(
    (p) => p.amphoe === amphoe && p.province === province,
  );
  const districts = amphoes.map((a) => a.district);
  return districts.filter(distinct);
};

// export const getZipCodeFromDistricts = (
//   province: string,
//   amphoe: string,
//   district: string
// ) => {
//   if (!district || !amphoe || !province) {
//     return "";
//   }
//   const districts = countryAndStates.filter(
//     (p) =>
//       p.amphoe === amphoe && p.province === province && p.district === district
//   );
//   const zipcodes = districts.map((a) => a.zipcode);
//   return zipcodes.filter(distinct)[0];
// };
