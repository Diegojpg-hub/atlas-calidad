# Bienvenido/a

Este proyecto fue desarrollado para la asignatura ISY1102 - Calidad y seguridad en el desarrollo de software. En este repositorio se incluye un Frontend y Backend asociados al Caso A de la asignatura llamado "Sistema de Gestión Atlas".

Este software permitirá a usuarios registrados (por empresas) gestionar clientes, contratos y documentos asociados, administrar usuarios y roles internos de la empresa, auditar acciones, y garantizar cumplimiento de normativa de protección de datos y estándares de seguridad. Debe ser accesible desde desktop, tablets y móviles, con especial atención a la usabilidad para adultos mayores.

Este proyecto está pensando para ser utilizado de las siguientes maneras:
 - Podrás inicializar el backend y frontend por separado y según tu lo requieras
 - Podrás efectuar análisis de código estático para frontend y backend.
 - Podrás efectuar análisis de código dinámico al levantar ambos servicios.
 - Utilizar docker en lugar de levantar manualmente cada servicio ya que se incluye una imagen para el proyecto completo que inicializa y configura cada elemento del software construido.
 

## Estructura

Abre el proyecto mediante terminal o editor de código de preferencia Visual Studio Code. El software tiene la siguiente estructura de carpetas y archivos
 
```
root
	|/BACKEND
	|/FRONTEND
	|.env
	|.gitignore
	|docker-compose.yml
	|package.json
	|README.md
```
En el archivo `.env` se definen las variables de entorno que utilizará docker al momento de crear las imágenes, por lo que puedes modificarlas en el caso de tener otros servicios corriendo en tu equipo que utilicen los mismos puertos.

1. JWT_SECRET: (definida en el archivo .env, ver .env.example)
2. PORT_POSTGRES: `15433` Puerto expuesto que utilizará tu equipo para permitir acceder a la conexión a la base de datos
3. PORT_BACKEND: `4451` Puerto expuesto que utilizará tu equipo para acceder a la API
4. PORT_FRONTEND: `3351` Puerto expuesto que utilizará tu equipo para acceder al cliente - frontend

## Inicialización con Docker
Abre la terminal y situate en la raíz del proyecto y ejecuta el comando:

1. Ejecuta `docker-compose up -d` para levantar todos los servicios
2. El frontend estará disponible en `http://localhost:3351` (o el puerto configurado en .env)
3. El backend estará disponible en `http://localhost:4451` (o el puerto configurado en .env)
4. La base de datos estará disponible para conectarse mediante:
	4.1 Host: `localhost`
	4.2 Port: `15433 `(o el configurado en .env)
	4.3 Database: `atlas`
	4.4 Nombre de usuario: `postgres`
	4.5 Contraseña: `postgres`

## Análisis de código con SonarQube

SonarQube analiza el código fuente (análisis estático) del BACKEND y del FRONTEND y entrega un informe con **bugs, vulnerabilidades, puntos críticos de seguridad (Security Hotspots) y problemas de mantenibilidad (Code Smells)**. Se ejecuta con Docker en un archivo **independiente** (`docker-compose.sonar.yml`), por lo que no modifica ni afecta el arranque de Atlas.

Requisitos: Docker Desktop abierto, unos 3 GB de RAM libres y el puerto `9000` disponible. El análisis no necesita que Atlas esté encendido.

### Archivos agregados

- `docker-compose.sonar.yml`: define el servidor SonarQube, su propia base de datos PostgreSQL y los dos scanners (backend y frontend).
- `.env.sonar`: configuración de SonarQube (puerto, clave de su base de datos y el token de análisis).
- `BACKEND/sonar-project.properties` y `FRONTEND/sonar-project.properties`: indican qué carpetas analizar y con qué nombre de proyecto.
- `sonar.cmd`: atajo para no escribir los comandos largos de Docker.

### Paso a paso

Abre PowerShell en la carpeta principal del proyecto (donde está `docker-compose.yml`) y sigue en orden:

1. Enciende SonarQube: `.\sonar.cmd up`. La primera vez descarga las imágenes y puede tardar varios minutos. Termina cuando muestra "SonarQube esta listo".
2. Abre `http://localhost:9000` en el navegador. Usuario `admin` y contraseña `admin`; SonarQube te pedirá cambiar la contraseña.
3. Genera un token de análisis: clic en el ícono de tu usuario (arriba a la derecha) → **My Account** → pestaña **Security** → en "Generate Tokens" escribe el nombre `atlas`, tipo **User Token**, elige una expiración y presiona **Generate**. Copia el token (solo se muestra una vez).
4. Abre `.env.sonar` con el Bloc de notas y pega el token en la línea `SONAR_TOKEN=` (sin espacios ni comillas). Guarda el archivo.
5. Ejecuta el análisis: `.\sonar.cmd scan`. Analiza BACKEND y FRONTEND, uno después del otro.
6. Revisa los resultados en `http://localhost:9000/projects`: aparecerán los proyectos **Atlas - Backend (API)** y **Atlas - Frontend (React)**. Entra a cada uno para ver *Issues*, *Security Hotspots* y el estado del *Quality Gate*.

Cada vez que cambies el código y quieras un nuevo informe, basta con repetir `.\sonar.cmd scan`.

### Comandos del atajo

| Comando | Qué hace |
|---|---|
| `.\sonar.cmd up` | Enciende SonarQube y espera a que esté listo |
| `.\sonar.cmd scan` | Analiza BACKEND y FRONTEND |
| `.\sonar.cmd scan-backend` / `scan-frontend` | Analiza solo una de las partes |
| `.\sonar.cmd status` | Muestra si SonarQube está encendido y listo |
| `.\sonar.cmd logs` | Muestra los registros (salir con `Ctrl + C`) |
| `.\sonar.cmd stop` | Apaga SonarQube conservando sus datos |
| `.\sonar.cmd down` | Elimina los contenedores conservando sus datos |
| `.\sonar.cmd reset` | Borra todo: proyectos, resultados y contraseña |

### Sin el atajo (comandos completos)

```
docker compose --env-file .env.sonar -f docker-compose.sonar.yml up -d
docker compose --env-file .env.sonar -f docker-compose.sonar.yml run --rm scanner-backend
docker compose --env-file .env.sonar -f docker-compose.sonar.yml run --rm scanner-frontend
docker compose --env-file .env.sonar -f docker-compose.sonar.yml stop
```

Importante: usa siempre `--env-file .env.sonar`. Si se omite, Docker Compose toma el `.env` de Atlas y mezcla ambos proyectos.

### Notas

- **Puerto ocupado:** cambia `PORT_SONARQUBE` en `.env.sonar` (por ejemplo, a `9001`) y ejecuta `.\sonar.cmd down` y luego `.\sonar.cmd up`.
- **Si SonarQube no inicia o va muy lento:** revisa `.\sonar.cmd logs`. Suele faltar memoria; en Docker Desktop, en *Settings → Resources*, asígnale al menos 4 GB.
- **Seguridad:** el token equivale a una contraseña. No subas `.env.sonar` a Git con un token real dentro. La variable `SONAR_ES_BOOTSTRAP_CHECKS_DISABLE` del compose es solo para uso local; no la uses en un servidor real.
