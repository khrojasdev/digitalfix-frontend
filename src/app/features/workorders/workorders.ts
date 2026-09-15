import { Component } from '@angular/core';
import { EnConstruccion } from '../../shared/components/en-construccion/en-construccion';

@Component({
  selector: 'app-workorders',
  standalone: true,
  imports: [EnConstruccion],
  template: `
    <app-en-construccion
      titulo="Órdenes de trabajo"
      icono="assignment"
      proposito="El centro de la operación: registrar una falla, asignarla a un técnico y
                 seguir su estado hasta el cierre, descontando del stock los repuestos que
                 se usen."
      [capacidades]="capacidades"
      historias="HU-20 a HU-24"
      dependeDe="ms-digitalfix-workorders">
    </app-en-construccion>
  `,
})
export class Workorders {
  protected readonly capacidades = [
    'Crear una orden a partir de una falla reportada por el cliente',
    'Asignarla a un técnico, con descuento automático del stock de repuestos',
    'Seguir su estado: recibida, asignada, en ejecución, cerrada',
    'Ver el historial completo de cada orden y quién hizo cada cambio',
  ];
}
