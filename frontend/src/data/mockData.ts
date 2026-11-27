import { Vacante, Postulacion, EjercicioPractica, PerfilProfesional } from '../types';

export const PERFILES_MOCK: PerfilProfesional[] = [
  { id: 1, nombre: 'Desarrollo de Software Fullstack', descripcion: 'Frontend, backend, bases de datos y arquitecturas web.' },
  { id: 2, nombre: 'Ciencia de Datos e Inteligencia Artificial', descripcion: 'Machine learning, análisis exploratorio, SQL y Python.' },
  { id: 3, nombre: 'Diseño UX/UI & Producto Digital', descripcion: 'Investigación de usuarios, Figma, sistemas de diseño y prototipado.' },
  { id: 4, nombre: 'Ciberseguridad y Redes', descripcion: 'Hacking ético, auditoría de seguridad y hardening de sistemas.' },
  { id: 5, nombre: 'Soporte Técnico e Infraestructura', descripcion: 'Sistemas operativos, cloud y atención especializada.' },
];

export const VACANTES_MOCK: Vacante[] = [
  {
    id: 1,
    empresa_id: 101,
    empresa_nombre: 'NovaTech Soluciones',
    perfil_id: 1,
    perfil_nombre: 'Desarrollo de Software Fullstack',
    titulo: 'Desarrollador Fullstack Junior (React + FastAPI)',
    descripcion: 'Buscamos aprendiz egresado o profesional con sólidos fundamentos en React, Python FastAPI y PostgreSQL. Participarás en la construcción de módulos cloud.',
    requisitos: 'Conocimientos de REST APIs, Git, Docker básico y pruebas unitarias.',
    ubicacion: 'Barranquilla / Remoto',
    modalidad: 'remoto',
    salario_rango: '$2.500.000 - $3.200.000 COP',
    tiempo_limite_minutos: 45,
    puntaje_minimo: 70,
    peso_cv: 40,
    peso_prueba: 60,
    estado: 'abierta',
    total_postulaciones: 8,
    created_at: '2026-11-15'
  },
  {
    id: 2,
    empresa_id: 102,
    empresa_nombre: 'DataCorp Analytics',
    perfil_id: 2,
    perfil_nombre: 'Ciencia de Datos e Inteligencia Artificial',
    titulo: 'Analista de Datos Junior',
    descripcion: 'Generación de dashboards, limpieza de datasets con Pandas y creación de modelos predictivos para clientes del sector financiero.',
    requisitos: 'Manejo avanzado de SQL, Python (Pandas, Numpy), Power BI o Metabase.',
    ubicacion: 'Medellín / Híbrido',
    modalidad: 'hibrido',
    salario_rango: '$2.800.000 - $3.500.000 COP',
    tiempo_limite_minutos: 60,
    puntaje_minimo: 75,
    peso_cv: 50,
    peso_prueba: 50,
    estado: 'abierta',
    total_postulaciones: 5,
    created_at: '2026-11-17'
  },
  {
    id: 3,
    empresa_id: 101,
    empresa_nombre: 'NovaTech Soluciones',
    perfil_id: 3,
    perfil_nombre: 'Diseño UX/UI & Producto Digital',
    titulo: 'Diseñador UI/UX Junior',
    descripcion: 'Creación de flujos de usuario, wireframes y componentes reutilizables en Figma para aplicaciones SaaS.',
    requisitos: 'Portafolio en Figma, principios de usabilidad heurística y accesibilidad WCAG.',
    ubicacion: 'Remoto',
    modalidad: 'remoto',
    salario_rango: '$2.200.000 - $2.800.000 COP',
    tiempo_limite_minutos: 40,
    puntaje_minimo: 65,
    peso_cv: 60,
    peso_prueba: 40,
    estado: 'abierta',
    total_postulaciones: 6,
    created_at: '2026-11-18'
  }
];

export const POSTULACIONES_MOCK: Postulacion[] = [
  {
    id: 1001,
    vacante_id: 1,
    vacante_titulo: 'Desarrollador Fullstack Junior (React + FastAPI)',
    candidato_id: 201,
    candidato_nombre: 'Juan Sebastian Montes Osorio',
    candidato_email: 'juanse.montes@prepia.com',
    hoja_de_vida: {
      nombre_archivo: 'HV_Juan_Montes_ADSO.pdf',
      resumen_perfil: 'Tecnólogo en Análisis y Desarrollo de Software (SENA). Experiencia en Python, FastAPI, React y PostgreSQL.',
      habilidades_detectadas: ['Python', 'FastAPI', 'React', 'PostgreSQL', 'Docker', 'Git', 'TailwindCSS'],
      anios_experiencia: 1.5,
      puntaje_match_cv: 92
    },
    puntaje_cv: 92,
    puntaje_prueba: 88,
    puntaje_final: 89.6,
    estado: 'en_revision',
    sugerencia_ia: 'apto',
    retroalimentacion_ia: 'Excelente concordancia en el stack backend y bases de datos relacionales. En la prueba técnica demostró óptimo manejo de control de errores y estructura modular.',
    created_at: '2026-11-16'
  },
  {
    id: 1002,
    vacante_id: 1,
    vacante_titulo: 'Desarrollador Fullstack Junior (React + FastAPI)',
    candidato_id: 202,
    candidato_nombre: 'Thomas Cortez',
    candidato_email: 'thomas.cortez@prepia.com',
    hoja_de_vida: {
      nombre_archivo: 'HV_Thomas_Cortez.pdf',
      resumen_perfil: 'Desarrollador enfocado en frontend y APIs REST con React y Node/Python.',
      habilidades_detectadas: ['React', 'JavaScript', 'Python', 'SQL', 'Git', 'Figma'],
      anios_experiencia: 1.2,
      puntaje_match_cv: 85
    },
    puntaje_cv: 85,
    puntaje_prueba: 82,
    puntaje_final: 83.2,
    estado: 'aprobado',
    sugerencia_ia: 'apto',
    retroalimentacion_ia: 'Sólida resolución lógica y maquetación de interfaces. Recomendado para avanzar a entrevista cultural.',
    decision_reclutador: {
      estado: 'aprobado',
      reclutador_nombre: 'Laura Mendoza (Talento NovaTech)',
      notas: 'Muy buen perfil técnico. Cumple con creces los requisitos de la vacante.',
      fecha: '2026-11-18 14:30'
    },
    created_at: '2026-11-16'
  },
  {
    id: 1003,
    vacante_id: 1,
    vacante_titulo: 'Desarrollador Fullstack Junior (React + FastAPI)',
    candidato_id: 203,
    candidato_nombre: 'Luis Ibarra',
    candidato_email: 'luis.ibarra@prepia.com',
    hoja_de_vida: {
      nombre_archivo: 'HV_Luis_Ibarra_Dev.pdf',
      resumen_perfil: 'Analista y desarrollador con énfasis en arquitectura de bases de datos y algoritmos.',
      habilidades_detectadas: ['PostgreSQL', 'Python', 'FastAPI', 'Linux', 'Git', 'Algoritmos'],
      anios_experiencia: 1.4,
      puntaje_match_cv: 88
    },
    puntaje_cv: 88,
    puntaje_prueba: 85,
    puntaje_final: 86.2,
    estado: 'en_revision',
    sugerencia_ia: 'apto',
    retroalimentacion_ia: 'Gran capacidad de modelado relacional y optimización de consultas SQL. Código limpio.',
    created_at: '2026-11-17'
  },
  {
    id: 1004,
    vacante_id: 1,
    vacante_titulo: 'Desarrollador Fullstack Junior (React + FastAPI)',
    candidato_id: 204,
    candidato_nombre: 'Carlos Andrés Vega',
    candidato_email: 'carlos.vega@example.com',
    hoja_de_vida: {
      nombre_archivo: 'CV_Carlos_Vega.pdf',
      resumen_perfil: 'Estudiante de sistemas con proyectos personales en PHP y Java.',
      habilidades_detectadas: ['PHP', 'MySQL', 'HTML/CSS', 'Java'],
      anios_experiencia: 0.5,
      puntaje_match_cv: 52
    },
    puntaje_cv: 52,
    puntaje_prueba: 58,
    puntaje_final: 55.6,
    estado: 'rechazado',
    sugerencia_ia: 'no_cumple',
    retroalimentacion_ia: 'No alcanza el puntaje mínimo de 70. Se sugiere fortalecer conocimientos en Python moderno y frameworks reactivos.',
    decision_reclutador: {
      estado: 'rechazado',
      reclutador_nombre: 'Laura Mendoza (Talento NovaTech)',
      notas: 'El perfil no coincide con las tecnologías prioritarias de la vacante.',
      fecha: '2026-11-18 10:15'
    },
    created_at: '2026-11-17'
  }
];

export const PREGUNTAS_PRUEBA_MOCK = [
  {
    id: 1,
    tipo: 'opcion_multiple' as const,
    enunciado: 'En FastAPI, ¿cuál es la forma canónica de definir validación estricta y tipado para el cuerpo de una petición JSON?',
    puntos: 20,
    opciones: [
      { id: 'a', texto: 'Definir una clase que herede de pydantic.BaseModel' },
      { id: 'b', texto: 'Recibir un diccionario genérico dict y usar if/else' },
      { id: 'c', texto: 'Crear una entidad de SQLAlchemy directamente' },
      { id: 'd', texto: 'Usar expresiones regulares en los query parameters' }
    ]
  },
  {
    id: 2,
    tipo: 'opcion_multiple' as const,
    enunciado: '¿Por qué en PostgreSQL es crucial el uso de índices compuestos en tablas de alta transaccionalidad?',
    puntos: 20,
    opciones: [
      { id: 'a', texto: 'Porque reducen a la mitad el tamaño del archivo en disco' },
      { id: 'b', texto: 'Porque optimizan consultas con filtros WHERE sobre múltiples columnas ordenadas frecuentemente' },
      { id: 'c', texto: 'Porque impiden que ocurran ataques de SQL Injection' },
      { id: 'd', texto: 'Solo funcionan para columnas de tipo UUID o VARCHAR(255)' }
    ]
  },
  {
    id: 3,
    tipo: 'codigo' as const,
    enunciado: 'Implementa una función en Python llamada `filtrar_candidatos_aptos(candidatos, umbral)` que reciba una lista de diccionarios con `nombre` y `puntaje_final`, y devuelva únicamente los nombres de quienes superen o igualen el umbral, ordenados de mayor a menor puntaje.',
    lenguaje: 'python',
    codigo_inicial: `def filtrar_candidatos_aptos(candidatos: list, umbral: float) -> list:
    # Escribe tu solución aquí
    aptos = [c for c in candidatos if c["puntaje_final"] >= umbral]
    aptos_ordenados = sorted(aptos, key=lambda x: x["puntaje_final"], reverse=True)
    return [c["nombre"] for c in aptos_ordenados]
`,
    puntos: 60
  }
];

export const EJERCICIOS_PRACTICA_MOCK: EjercicioPractica[] = [
  {
    id: 1,
    titulo: 'Filtrado y Scoring de Candidatos',
    dificultad: 'Intermedio',
    lenguaje: 'Python',
    categoria: 'Algoritmos y Listas',
    descripcion: 'Calcula el promedio ponderado entre pruebas técnicas y compatibilidad de CV aplicando pesos porcentuales.',
    plantilla_codigo: 'def calcular_ranking(cv_score: float, test_score: float, w_cv: float = 0.4) -> float:\n    # Tu código aquí\n    pass'
  },
  {
    id: 2,
    titulo: 'Manejo de Tokens JWT y Expiración',
    dificultad: 'Avanzado',
    lenguaje: 'Python',
    categoria: 'Seguridad y Auth',
    descripcion: 'Implementa la decodificación de un token JWT validando expiración y firma criptográfica HS256.',
    plantilla_codigo: 'def verificar_token(token: str, secret_key: str) -> dict:\n    # Tu código aquí\n    pass'
  },
  {
    id: 3,
    titulo: 'Consulta SQL: Ranking de Postulaciones',
    dificultad: 'Básico',
    lenguaje: 'SQL',
    categoria: 'Bases de Datos Relacionales',
    descripcion: 'Escribe una consulta SELECT con JOIN entre postulaciones y vacantes que filtre por vacante_id y ordene descendentemente.',
    plantilla_codigo: 'SELECT p.candidato_nombre, p.puntaje_final \nFROM postulaciones p \nWHERE p.vacante_id = 1 \nORDER BY p.puntaje_final DESC;'
  }
];
