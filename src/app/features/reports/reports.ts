import { Component } from '@angular/core';
import { EnConstruccion } from '../../shared/components/en-construccion/en-construccion';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [EnConstruccion],
  template: `
    <app-en-construccion
      titulo="Reportes"
      icono="insights"
      proposito="Los indicadores con los que una empresa decide: cuánto trabajo entra, cuánto
                 se cierra a tiempo y dónde se va el costo de repuestos."
      [capacidades]="capacidades"
      historias="HU-30 a HU-32"
      dependeDe="ms-digitalfix-report">
    </app-en-construccion>
  `,
})
export class Reports {
  protected readonly capacidades = [
    'Órdenes cerradas y pendientes por período',
    'Tiempo medio de resolución, por técnico y por tipo de servicio',
    'Consumo y costo de repuestos, con los que más rotan',
    'Exportación de cada indicador para llevárselo fuera del sistema',
  ];
}
