import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResumoAdmin } from '../models/admin';

@Injectable({ providedIn: 'root' })
export class AdminResumoService {
  private readonly http = inject(HttpClient);

  buscar(): Observable<ResumoAdmin> {
    return this.http.get<ResumoAdmin>('/api/admin/resumo');
  }
}
