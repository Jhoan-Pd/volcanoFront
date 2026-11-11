/**
 * Fact sheets of the monitored diseases. Editorial content (Spanish, shown as is) that does not
 * depend on the weekly data: that is why its pages are SSG (generated once, at build time).
 * General public-health information; it does not replace a medical consultation.
 */
export interface DiseaseSheet {
  code: string;
  name: string;
  summary: string;
  symptoms: string[];
  transmission: string;
  riskGroups: string[];
  prevention: string[];
  seekCare: string[];
  /** Which signals of the predictor anticipate this disease. */
  signals: { group: string; detail: string }[];
  context: string;
}

export const DISEASE_SHEETS: Record<string, DiseaseSheet> = {
  IRA: {
    code: "IRA",
    name: "Gripe e infección respiratoria aguda",
    summary: "Infecciones de la nariz, la garganta, los bronquios o los pulmones causadas sobre todo por virus (influenza, virus "
      + "sincitial respiratorio, rinovirus, SARS-CoV-2). Son la causa más frecuente de consulta en temporada de lluvias.",
    symptoms: ["Tos y dolor de garganta", "Fiebre o escalofríos", "Congestión o secreción nasal", "Dolor de cabeza y cuerpo",
      "Dificultad para respirar en los casos graves"],
    transmission: "De persona a persona por gotas y aerosoles al toser, estornudar o hablar, y por manos o superficies contaminadas.",
    riskGroups: ["Menores de 5 años", "Mayores de 60 años", "Personas con asma, EPOC, diabetes o enfermedades del corazón", "Gestantes"],
    prevention: ["Lavarse las manos con agua y jabón con frecuencia", "Cubrirse al toser o estornudar con el antebrazo",
      "Usar tapabocas si hay síntomas y evitar aglomeraciones", "Ventilar los espacios cerrados",
      "Vacunarse contra la influenza (especialmente niños, mayores y gestantes)"],
    seekCare: ["Respiración rápida o con hundimiento de costillas", "Fiebre de más de 3 días", "Labios morados o somnolencia",
      "En niños: no quiere comer ni beber"],
    signals: [
      { group: "Clima", detail: "Lluvia acumulada y humedad de las últimas semanas: con frío y lluvia la gente se reúne en espacios cerrados." },
      { group: "Búsquedas en internet", detail: "Aumento de búsquedas de «gripa», «tos» o «fiebre» en Nariño frente a su nivel habitual." },
      { group: "Ventas en farmacias", detail: "Más antigripales y antipiréticos vendidos que el promedio de las 52 semanas anteriores." },
      { group: "Estacionalidad", detail: "Las mismas semanas del año anterior (picos con las temporadas de lluvia)." },
    ],
    context: "En Pasto (2 527 m s. n. m.) las temperaturas bajas y las dos temporadas de lluvia del año concentran los picos de IRA.",
  },
  EDA: {
    code: "EDA",
    name: "Enfermedad diarreica aguda",
    summary: "Tres o más deposiciones líquidas en 24 horas, casi siempre por virus (rotavirus, norovirus), bacterias o parásitos "
      + "presentes en agua o alimentos contaminados. El mayor riesgo es la deshidratación.",
    symptoms: ["Deposiciones líquidas frecuentes", "Dolor o cólico abdominal", "Náuseas o vómito", "Fiebre en algunos casos",
      "Signos de deshidratación: boca seca, poca orina, ojos hundidos"],
    transmission: "Por agua o alimentos contaminados y de persona a persona cuando no hay buen lavado de manos.",
    riskGroups: ["Menores de 5 años", "Adultos mayores", "Hogares sin agua potable o saneamiento adecuado"],
    prevention: ["Hervir o tratar el agua de consumo", "Lavarse las manos antes de comer y después de ir al baño",
      "Lavar y cocinar bien los alimentos", "Mantener la lactancia materna", "Tener sales de rehidratación oral en casa"],
    seekCare: ["Sangre en las heces", "No puede beber o vomita todo", "Signos de deshidratación", "Diarrea por más de 3 días"],
    signals: [
      { group: "Clima", detail: "Lluvias fuertes recientes: arrastran contaminantes a las fuentes de agua." },
      { group: "Ventas en farmacias", detail: "Aumento en la venta de sales de rehidratación oral." },
      { group: "Búsquedas en internet", detail: "Búsquedas de «diarrea» o «vómito» por encima de lo habitual." },
      { group: "Casos recientes", detail: "Tendencia de las últimas 4 a 8 semanas en el municipio." },
    ],
    context: "En la zona rural de los municipios del Galeras parte del agua viene de acueductos veredales: las lluvias intensas elevan el riesgo.",
  },
  DENGUE: {
    code: "DENGUE",
    name: "Dengue",
    summary: "Enfermedad viral transmitida por la picadura del mosquito Aedes aegypti. Se presenta en municipios cálidos por "
      + "debajo de unos 1 800 m s. n. m.; en Pasto, por la altura, los casos suelen ser importados.",
    symptoms: ["Fiebre alta de inicio súbito", "Dolor detrás de los ojos", "Dolor muscular y de articulaciones",
      "Erupción en la piel", "Signos de alarma: dolor abdominal intenso, vómito persistente, sangrado"],
    transmission: "Picadura del mosquito Aedes aegypti, que se cría en agua limpia estancada (tanques, llantas, floreros).",
    riskGroups: ["Personas que viven o viajan a zonas cálidas", "Niños y adultos mayores", "Quien ya tuvo dengue (más riesgo de dengue grave)"],
    prevention: ["Lavar y tapar tanques y recipientes con agua cada semana", "Eliminar llantas, botellas y objetos que acumulen agua",
      "Usar repelente y ropa de manga larga", "Instalar toldillos y angeos"],
    seekCare: ["Cualquier fiebre en zona de dengue: no automedicarse con ibuprofeno ni aspirina",
      "Dolor abdominal fuerte, vómito persistente o sangrado de encías", "Somnolencia o irritabilidad"],
    signals: [
      { group: "Clima", detail: "Temperatura y lluvia de 4 a 6 semanas atrás: es el tiempo que tarda el ciclo del mosquito y del virus." },
      { group: "Municipio", detail: "La altitud: en Consacá (≈1 730 m) el riesgo es mucho mayor que en Pasto." },
      { group: "Ventas en farmacias", detail: "Repelentes y antipiréticos por encima de lo habitual." },
    ],
    context: "El calentamiento hace que el mosquito suba cada vez más en la cordillera: vigilar municipios de altura media es clave.",
  },
  RESP_CENIZA: {
    code: "RESP_CENIZA",
    name: "Afecciones respiratorias por ceniza volcánica",
    summary: "Irritación de las vías respiratorias, los ojos y la piel por la ceniza y los gases (SO₂) que emite el Volcán Galeras. "
      + "Empeora el asma y la EPOC y puede desencadenar bronquitis.",
    symptoms: ["Tos seca e irritación de garganta", "Silbido en el pecho o sensación de ahogo", "Ojos rojos y ardor",
      "Secreción nasal", "Crisis de asma en personas asmáticas"],
    transmission: "No es contagiosa: se produce al respirar partículas finas de ceniza o gases volcánicos.",
    riskGroups: ["Personas con asma, EPOC o enfermedades del corazón", "Niños y adultos mayores",
      "Habitantes de municipios a favor del viento del cráter", "Trabajadores al aire libre"],
    prevention: ["Usar tapabocas (idealmente N95) durante caídas de ceniza", "Cerrar puertas y ventanas",
      "Limpiar la ceniza humedeciéndola, sin barrer en seco", "Proteger los tanques de agua",
      "Seguir los boletines del Servicio Geológico Colombiano"],
    seekCare: ["Dificultad para respirar que no mejora", "Crisis de asma que no cede con el inhalador", "Dolor en el pecho"],
    signals: [
      { group: "Actividad volcánica", detail: "Emisión de SO₂ reportada en el boletín y caída de ceniza en el municipio en las últimas semanas." },
      { group: "Ventas en farmacias", detail: "Más tapabocas e inhaladores vendidos que de costumbre." },
      { group: "Clima", detail: "La lluvia «lava» la ceniza del aire; los días secos la mantienen suspendida." },
    ],
    context: "El Galeras es uno de los volcanes más activos de Colombia; Pasto está a unos 9 km del cráter.",
  },
};

export const DISEASE_CODES = Object.keys(DISEASE_SHEETS);
