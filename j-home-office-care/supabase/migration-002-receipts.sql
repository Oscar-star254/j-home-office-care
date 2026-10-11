-- =====================================================================
-- Migration 002: balance payment + receipts
-- Run once in Supabase -> SQL Editor -> New query -> Run
-- (safe to run twice)
-- =====================================================================

alter table public.bookings add column if not exists balance_paid boolean not null default false;
alter table public.bookings add column if not exists receipt_no   text unique;
alter table public.bookings add column if not exists completed_at timestamptz;
alter table public.payments add column if not exists kind text not null default 'deposit';   -- deposit | balance

-- Customers/employees may never edit money fields, receipt numbers or timestamps.
create or replace function public.protect_booking_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;   -- service role (payment callback)
  if public.is_admin() then return new; end if;

  new.deposit_paid     := old.deposit_paid;
  new.deposit_amount   := old.deposit_amount;
  new.estimated_price  := old.estimated_price;
  new.customer_id      := old.customer_id;
  new.employee_id      := old.employee_id;
  new.service_id       := old.service_id;
  new.balance_paid     := old.balance_paid;
  new.receipt_no       := old.receipt_no;
  new.completed_at     := old.completed_at;

  if auth.uid() = old.employee_id then
    if not old.deposit_paid then new.status := old.status; end if;
    if new.status not in ('accepted','declined','in_progress','completed') then new.status := old.status; end if;
    if new.status = 'declined' and old.deposit_paid then new.status := 'refund_due'; end if;
  elsif auth.uid() = old.customer_id then
    if new.status not in ('cancelled') then new.status := old.status; end if;
    if new.status = 'cancelled' and old.deposit_paid then new.status := 'refund_due'; end if;
  end if;
  return new;
end $$;

-- When a job becomes "completed": stamp the time and tell the customer to pay the balance.
-- (named zz_ so it runs AFTER protect_booking)
create or replace function public.on_booking_completed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
    insert into notifications(user_id, title, body, link) values
      (new.customer_id, 'Job completed ✅',
       'Pay your remaining balance to get your receipt.', '/customer/bookings/' || new.id);
  end if;
  return new;
end $$;

drop trigger if exists zz_booking_completed_trg on public.bookings;
create trigger zz_booking_completed_trg before update on public.bookings
  for each row execute function public.on_booking_completed();

-- When the balance is paid (by the server or admin only): issue the receipt number.
create or replace function public.on_balance_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.balance_paid and not old.balance_paid then
    if old.status <> 'completed' or not old.deposit_paid then
      raise exception 'The balance can only be paid after the job is completed';
    end if;
    new.receipt_no := 'JHC-' || to_char(now() at time zone 'Africa/Nairobi', 'YYMMDD') || '-' || new.reference;
    insert into notifications(user_id, title, body, link) values
      (new.customer_id, 'Payment complete 🧾', 'Your receipt is ready. Open your booking to print it.', '/customer/bookings/' || new.id),
      (new.employee_id, 'Customer paid in full', 'Booking ' || new.reference || ' is fully paid.', '/employee/jobs/' || new.id);
  end if;
  return new;
end $$;

drop trigger if exists zz_balance_paid_trg on public.bookings;
create trigger zz_balance_paid_trg before update on public.bookings
  for each row execute function public.on_balance_paid();
