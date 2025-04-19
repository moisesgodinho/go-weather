import { DateTime } from "luxon";

const API_KEY = "6bb49c76155087f1b11a54c314f302a2";
const BASE_URL = "https://api.openweathermap.org/data/2.5/";
const LANG = "pt_br";

const getWeatherData = (infoType, searchParams) => {
  const url = new URL(BASE_URL + infoType);
  url.search = new URLSearchParams({
    ...searchParams,
    appid: API_KEY,
    lang: LANG,
  });
  return fetch(url).then((res) => res.json());
};

const iconUrlFromCode = (icon) => `./src/assets/icons/${icon}.png`;

const hpaToAtm = (pressure) => pressure / 1013;

const metroPorSegundoParaKmHora = (meter) => Math.round(meter * 3.6);

export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const capitalizeAllWords = (str) => {
  return str.split(" ").map(capitalizeFirstLetter).join(" ");
};

const meterToKm = (meter) => {
  const km = meter / 1000;
  return Number.isInteger(km) ? km : parseFloat(km.toFixed(2));
};

const formatToLocalTime = (
  secs,
  offset,
  format = "cccc, dd 'de' LLLL 'de' yyyy' | Horario Local: 'HH:mm",
  locale = "pt-BR"
) => {
  const formattedString = DateTime.fromSeconds(secs + offset, { zone: "utc" })
    .setLocale(locale)
    .toFormat(format);
  return capitalizeFirstLetter(formattedString);
};

const formatCurrent = (data) => {
  const {
    coord: { lat, lon },
    main: { temp, feels_like, temp_min, temp_max, humidity, pressure },
    name,
    dt,
    sys: { country, sunrise, sunset },
    weather,
    wind: { speed },
    timezone,
    visibility,
  } = data;

  const { main: icon, description } = weather[0];

  return {
    temp: Math.round(temp),
    description: capitalizeAllWords(description),
    feels_like: Math.round(feels_like),
    temp_min: Math.round(temp_min),
    temp_max: Math.round(temp_max),
    humidity,
    name,
    country,
    sunrise: formatToLocalTime(sunrise, timezone, "HH:mm"),
    sunset: formatToLocalTime(sunset, timezone, "HH:mm"),
    speed,
    icon: iconUrlFromCode(icon),
    localDate: formatToLocalTime(
      data.dt,
      timezone,
      "cccc, dd 'de' LLLL 'de' yyyy'"
    ),
    formattedLocalTime: formatToLocalTime(
      data.dt,
      timezone,
      "'Horario Local: 'HH:mm"
    ),
    dt,
    timezone,
    lat,
    lon,
    pressure: Math.round(hpaToAtm(pressure)),
    visibility: meterToKm(visibility),
  };
};

const groupByDay = (data) => {
  return data.reduce((acc, curr) => {
    const date = curr.dt_txt.split(" ")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(curr);
    return acc;
  }, {});
};

const formatForecastWeather = (secs, offset, data) => {
  const groupedByDay = groupByDay(data);

  const hourly = data
    .filter((f) => f.dt > secs)
    .map((f) => ({
      temp: Math.round(f.main.temp),
      title: formatToLocalTime(f.dt, offset, "HH:mm"),
      icon: iconUrlFromCode(f.weather[0].icon),
      date: f.dt_txt,
      speed: metroPorSegundoParaKmHora(f.wind.speed),
      deg: f.wind.deg,
    }))
    .slice(0, 16);

  const daily = Object.keys(groupedByDay)
    .map((date) => {
      const dayData = groupedByDay[date];
      const temps = dayData.map((d) => d.main.temp);
      const temp_max = Math.round(Math.max(...temps));
      const temp_min = Math.round(Math.min(...temps));
      return {
        temp_max,
        temp_min,
        title: formatToLocalTime(
          DateTime.fromISO(date).toSeconds(),
          offset,
          "cccc"
        ),
        icon: iconUrlFromCode(dayData[0].weather[0].icon),
        date: formatToLocalTime(
          DateTime.fromISO(date).toSeconds(),
          offset,
          "dd 'de' LLLL'"
        ),
      };
    })
    .slice(1, 6);

  return { hourly, daily };
};

const getFormattedWeatherDate = async (searchParams) => {
  const formattedCurrentWeather = await getWeatherData(
    "weather",
    searchParams
  ).then(formatCurrent);

  const { dt, lat, lon, timezone } = formattedCurrentWeather;
  const formattedForecastWeather = await getWeatherData("forecast", {
    lat,
    lon,
    units: searchParams.units,
  }).then((d) => formatForecastWeather(dt, timezone, d.list));

  return { ...formattedCurrentWeather, ...formattedForecastWeather };
};

export default getFormattedWeatherDate;
