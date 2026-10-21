import { Component } from '@angular/core';
import { EnConstruccion } from '../../shared/components/en-construccion/en-construccion';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [EnConstruccion],
  template: `
    <app-en-construccion
      titulo="Auditoría"
      icono="fact_check"
      proposito="La bitácora de quién hizo qué y cuándo. Se escribe sola y no se puede
                 editar ni borrar: un registro que se puede alterar no sirve para auditar
                 nada."
      [capacidades]="capacidades"
      historias="HU-40 a HU-42"
      dependeDe="ms-digitalfix-audit">
    </app-en-construccion>
  `,
})
export class Audit {
  protected readonly capacidades = [
    'Registro inmutable de cada alta, cambio y baja del sistema',
    'Búsqueda por persona, por fecha y por tipo de evento',
    'Trazabilidad completa de una orden desde que entra hasta que se cierra',
    'Acceso restringido a los roles Admin y Auditor',
  ];
}
