import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        let message = 'Operation completed successfully.';

        // Custom messages based on method or path can be added here
        if (context.switchToHttp().getRequest().method === 'POST') {
           message = 'Record created successfully.';
        } else if (context.switchToHttp().getRequest().method === 'DELETE') {
           message = 'Record deleted successfully.';
        }

        const { message: _msg, data: _data, ...rest } = data?.message ? data : { message: null, data: null };
        return {
          success: true,
          message: data?.message || message,
          data: data?.message ? data.data : data,
          ...(data?.message ? rest : {}),
        };
      }),
    );
  }
}
