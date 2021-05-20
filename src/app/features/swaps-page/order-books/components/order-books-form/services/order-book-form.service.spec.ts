import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { OrderBooksFormService } from './order-books-form.service';

describe('OrderBookFormService', () => {
  let service: OrderBooksFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [OrderBooksFormService]
    });
    service = TestBed.inject(OrderBooksFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});