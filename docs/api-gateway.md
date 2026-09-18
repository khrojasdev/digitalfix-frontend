# Conectar el frontend al API Gateway

Hoy el frontend habla directo con el BFF en `http://localhost:8080`. En el
despliegue, entre medio va un **AWS API Gateway** que valida el token antes de
que la petición llegue al BFF. Este documento es lo que hay que cambiar.

## Lo que cambia en el frontend: un archivo

Todo lo que depende del entorno vive en `src/environments/`. No hay ninguna
URL, identificador ni scope escrito en el código de la aplicación.

```ts
// src/environments/environment.ts
export const environment = {
  production: true,
  apiUrl: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod',
  azure: {
    clientId: '<el id de la aplicación en Entra>',
    tenantId: '<el id del tenant>',
    apiScope: 'api://<el id de la aplicación>/access_as_user',
    redirectUri: '/',
  },
};
```

De ahí salen tres cosas a la vez:

| Valor | Lo usa |
|---|---|
| `apiUrl` | `ApiService` para armar cada llamada, y el `protectedResourceMap` de MSAL para decidir a qué direcciones adjunta el token |
| `azure.clientId` y `azure.tenantId` | la configuración de MSAL |
| `azure.apiScope` | el scope que se pide al iniciar sesión y el que acompaña cada llamada a la API |

**`apiUrl` no lleva `/api` al final.** Cada servicio arma su ruta completa
(`api/catalog/services`), así que si estuviera aquí se duplicaría.

## Lo que hay que configurar en el gateway

### 1. Autorizador JWT

| Campo | Valor |
|---|---|
| Tipo | JWT |
| Issuer | `https://login.microsoftonline.com/<tenantId>/v2.0` |
| Audience | el `clientId` de la aplicación |
| Fuente del token | cabecera `Authorization` |

El BFF **vuelve a validar el token igualmente**. Es defensa en profundidad: si
alguna vez se alcanza al BFF sin pasar por el gateway, el token sigue siendo
obligatorio.

### 2. Rutas

Una sola ruta comodín hacia el BFF alcanza, porque el BFF ya distingue
internamente:

```
ANY /{proxy+}   ->  http://<ip-o-dns-del-EC2>:8080/{proxy}
```

`/actuator/health` debe quedar **sin autorizador**: lo consultan las sondas del
despliegue, que no llevan token.

### 3. CORS

El gateway responde el preflight; el BFF no debe volver a responderlo o el
navegador verá la cabecera `Access-Control-Allow-Origin` dos veces y rechazará
la respuesta.

| Campo | Valor |
|---|---|
| Origen permitido | el dominio donde queda publicado el frontend |
| Métodos | `GET, POST, PUT, DELETE, OPTIONS` |
| Cabeceras | `Authorization, Content-Type, X-Correlation-Id` |

`X-Correlation-Id` hay que permitirla explícitamente: es una cabecera propia y
sin ella el navegador bloquea toda petición que la lleve.

### 4. Cabeceras que el gateway NO debe dejar pasar

`X-User-Oid`, `X-Company-Id` y `X-Roles` son el contrato interno entre el BFF y
los microservicios. **El BFF las escribe de cero en cada llamada** y descarta
las que traiga el cliente, pero conviene bloquearlas también en el gateway:
son la llave del aislamiento entre empresas.

## Identificador de correlación

Cada llamada a la API sale con una cabecera `X-Correlation-Id` distinta
(`CorrelacionInterceptor`). Una llamada que falla deja rastro en tres sitios
—gateway, BFF y microservicio— y sin un identificador común hay que cruzarlos
por hora, que es justo lo que no funciona cuando hay carga. El BFF ya imprime
ese valor en su patrón de log.

## Comprobación después de desplegar

```bash
# 1. salud, sin token: debe responder 200
curl -i https://<gateway>/actuator/health

# 2. catálogo sin token: debe responder 401, y lo debe responder el GATEWAY
curl -i https://<gateway>/api/catalog/services

# 3. con token válido: 200 y solo los servicios de tu empresa
curl -i https://<gateway>/api/catalog/services -H "Authorization: Bearer <token>"
```

Si el punto 2 devuelve 401 pero con el cuerpo JSON del BFF en vez del del
gateway, el autorizador no está aplicado a esa ruta: el gateway está dejando
pasar la petición y quien rechaza es el BFF.

## Lo que queda fuera de este documento

El despliegue del propio contenedor sobre EC2 y el registro de la imagen. Eso
vive en `digitalfix-infra`.
