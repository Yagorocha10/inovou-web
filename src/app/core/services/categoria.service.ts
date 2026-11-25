import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Categoria } from '../models/catalogo';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly categorias$ = this.http
    .get<Categoria[]>('/api/categorias')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  listar(): Observable<Categoria[]> {
    return this.categorias$;
  }
}
