-- submit_consultation — the ONE anon-callable entry point for the
-- /consultation form. SECURITY DEFINER: runs as the owning role, which
-- bypasses RLS on contacts/consultations/consultation_files/
-- consultation_activity, so none of those tables need (or get) any
-- anon grant of their own. Re-validates everything server-side — never
-- trust consultation.js's client-side validation alone.
--
-- Exact option-string values below (preferred_contact/budget/timeline/
-- engagement_type) MUST stay byte-identical to consultation-data.js —
-- that file is the single source of truth; if the copy changes there,
-- update this function's case branches and check constraints to match.
--
-- TODO (deliberately not wired up — no email provider is configured
-- anywhere in this project yet):
--   Internal notification, to the studio team, on every 'submitted'
--   consultation_activity row:
--     Subject: New consultation — {{company}}
--     Body:
--       NEW INNOV8 CONSULTATION
--       {{reference}}
--       {{company}}
--       {{role}}
--       Budget: {{budget}}
--       Timeline: {{timeline}}
--       Services: {{services}}
--       Lead score: {{lead_score}}
--       View consultation -> (link once the admin panel exists)
--   Client confirmation, to contact_email, on success:
--     Subject: We received your consultation — Innov8
--     Body:
--       Thanks for reaching out to Innov8.
--       We've received the details of your project and will review
--       them personally.
--       If the opportunity is a good fit, we'll get back to you using
--       your preferred contact method to arrange the next conversation.
--       Consultation reference: {{reference}}
--       — Innov8 Studios
--   Future wiring: either (a) a pg_net POST to a webhook from a trigger
--   on consultation_activity (activity_type = 'submitted'), or (b) a
--   future Supabase Edge Function invoked the same way. Neither exists
--   yet — this comment is the seam.

create or replace function public.submit_consultation(
  p_full_name text,
  p_email text,
  p_company text,
  p_role text,
  p_website text,
  p_preferred_contact text,
  p_whatsapp_number text,
  p_phone_number text,
  p_services text[],
  p_other_service_detail text,
  p_brand_identity_subservices text[],
  p_social_content_subservices text[],
  p_three_d_cgi_subservices text[],
  p_digital_experiences_subservices text[],
  p_project_stage text,
  p_existing_assets text[],
  p_objective text,
  p_current_problem text,
  p_success_definition text,
  p_audience text[],
  p_audience_other text,
  p_industry text,
  p_industry_other text,
  p_timeline text,
  p_budget text,
  p_engagement_type text,
  p_additional_context text,
  p_final_contact_preference text,
  p_consent boolean,
  p_files jsonb default '[]'::jsonb,
  p_attribution jsonb default '{}'::jsonb,
  p_honeypot text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_contact_id uuid;
  v_consultation_id uuid;
  v_reference text;
  v_score int := 0;
  v_seq int;
  v_date_part text;
  v_recent_count int;
  v_file jsonb;
  v_verified_path text;
  v_attempt int := 0;
begin
  -- Honeypot: silently no-op, never raise. A raised exception is a
  -- signal a bot's retry logic can key off of; a fake-success shape
  -- with no id is not.
  if p_honeypot is not null and length(trim(p_honeypot)) > 0 then
    return jsonb_build_object('id', null, 'reference', null, 'dropped', true);
  end if;

  if p_full_name is null or length(trim(p_full_name)) < 2 or length(trim(p_full_name)) > 100 then
    raise exception 'Please enter your full name.';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address.';
  end if;

  if p_company is null or length(trim(p_company)) < 2 or length(trim(p_company)) > 150 then
    raise exception 'Please enter your company or brand name.';
  end if;

  if p_preferred_contact is null or p_preferred_contact not in ('Email', 'WhatsApp', 'Phone', 'Either') then
    raise exception 'Please choose how we should contact you.';
  end if;
  if p_preferred_contact = 'WhatsApp' and (p_whatsapp_number is null or length(trim(p_whatsapp_number)) < 7) then
    raise exception 'Please enter a valid WhatsApp number.';
  end if;
  if p_preferred_contact = 'Phone' and (p_phone_number is null or length(trim(p_phone_number)) < 7) then
    raise exception 'Please enter a valid phone number.';
  end if;

  if p_website is not null and length(trim(p_website)) > 0 and p_website !~ '^https?://[^\s]+\.[^\s]+' then
    raise exception 'Please enter a valid website address.';
  end if;

  if p_services is null or array_length(p_services, 1) is null then
    raise exception 'Please select at least one service.';
  end if;

  if p_objective is null or length(trim(p_objective)) < 30 or length(trim(p_objective)) > 2000 then
    raise exception 'Please tell us a little more about what you''re trying to achieve (at least 30 characters).';
  end if;
  if p_current_problem is not null and length(p_current_problem) > 2000 then
    raise exception 'That description is a little long — please keep it under 2000 characters.';
  end if;
  if p_success_definition is not null and length(p_success_definition) > 2000 then
    raise exception 'That description is a little long — please keep it under 2000 characters.';
  end if;
  if p_additional_context is not null and length(p_additional_context) > 2000 then
    raise exception 'That description is a little long — please keep it under 2000 characters.';
  end if;

  if p_timeline is null or p_timeline not in (
    'As soon as possible', 'Within 2 weeks', 'Within 1 month', '1-3 months', '3+ months', 'We''re exploring for now'
  ) then
    raise exception 'Please select a timeline.';
  end if;

  if p_budget is null or p_budget not in (
    'Under KES 100K', 'KES 100K-250K', 'KES 250K-500K', 'KES 500K-1M', 'KES 1M+', 'Not sure yet'
  ) then
    raise exception 'Please select a level of investment.';
  end if;

  if p_engagement_type is null or p_engagement_type not in (
    'One-off project', 'Ongoing creative partnership', 'Monthly retainer', 'Not sure yet'
  ) then
    raise exception 'Please select how you''d like to work with us.';
  end if;

  if p_consent is distinct from true then
    raise exception 'Please confirm you agree to be contacted about this consultation.';
  end if;

  -- Coarse, non-per-IP rate limit (deliberate — see plan: this function
  -- has no reliable access to the caller's real IP, and a new server
  -- endpoint was explicitly ruled out for this pass).
  select count(*) into v_recent_count
  from public.consultations
  where lower(contact_email) = v_email
    and created_at > now() - interval '1 hour';
  if v_recent_count >= 3 then
    raise exception 'You''ve already sent a few requests recently — our team will be in touch shortly. Please allow a little time before submitting again.';
  end if;

  -- Find-or-create the contact (reuse contacts, never a parallel identity table)
  select id into v_contact_id from public.contacts where lower(email) = v_email limit 1;
  if v_contact_id is null then
    insert into public.contacts (brand_name, person_name, email, phone, role, website, contact_type, source, status)
    values (
      trim(p_company), trim(p_full_name), v_email,
      coalesce(nullif(trim(coalesce(p_whatsapp_number, '')), ''), nullif(trim(coalesce(p_phone_number, '')), '')),
      p_role, p_website, 'Prospect', 'Consultation Form', 'Active'
    )
    returning id into v_contact_id;
  end if;

  -- Reference: INV-C-YYMMDD-#### (day-scoped counter), retried on the
  -- rare unique_violation race between the count() and the insert.
  v_date_part := to_char(now() at time zone 'utc', 'YYMMDD');
  loop
    v_attempt := v_attempt + 1;

    select count(*) + 1 into v_seq
    from public.consultations
    where created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
    v_reference := 'INV-C-' || v_date_part || '-' || lpad(v_seq::text, 4, '0');

    begin
      insert into public.consultations (
        reference, contact_id, status, priority, lead_score,
        full_name, contact_email, company, role, website,
        preferred_contact, whatsapp_number, phone_number,
        services, other_service_detail,
        brand_identity_subservices, social_content_subservices,
        three_d_cgi_subservices, digital_experiences_subservices,
        project_stage, existing_assets,
        objective, current_problem, success_definition,
        audience, audience_other, industry, industry_other,
        timeline, budget, engagement_type,
        additional_context, final_contact_preference,
        consent_given_at,
        source, landing_page, referral, referrer,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term
      ) values (
        v_reference, v_contact_id, 'New', 'Normal', 0,
        trim(p_full_name), v_email, trim(p_company), p_role, p_website,
        p_preferred_contact, p_whatsapp_number, p_phone_number,
        coalesce(p_services, '{}'::text[]), p_other_service_detail,
        coalesce(p_brand_identity_subservices, '{}'::text[]),
        coalesce(p_social_content_subservices, '{}'::text[]),
        coalesce(p_three_d_cgi_subservices, '{}'::text[]),
        coalesce(p_digital_experiences_subservices, '{}'::text[]),
        p_project_stage, coalesce(p_existing_assets, '{}'::text[]),
        trim(p_objective), p_current_problem, p_success_definition,
        coalesce(p_audience, '{}'::text[]), p_audience_other, p_industry, p_industry_other,
        p_timeline, p_budget, p_engagement_type,
        p_additional_context, p_final_contact_preference,
        now(),
        p_attribution ->> 'source', p_attribution ->> 'landingPage', p_attribution ->> 'referral', p_attribution ->> 'referrer',
        p_attribution ->> 'utm_source', p_attribution ->> 'utm_medium', p_attribution ->> 'utm_campaign',
        p_attribution ->> 'utm_content', p_attribution ->> 'utm_term'
      )
      returning id into v_consultation_id;
      exit;
    exception when unique_violation then
      if v_attempt > 8 then
        raise exception 'Something went wrong generating your reference number. Please try again.';
      end if;
      -- reference collision (rare) — loop and recompute v_seq
    end;
  end loop;

  -- Lead scoring (verbatim formula from the plan; capped at 100)
  v_score := 0;
  v_score := v_score + case p_budget
    when 'Under KES 100K' then 5
    when 'KES 100K-250K' then 15
    when 'KES 250K-500K' then 25
    when 'KES 500K-1M' then 35
    when 'KES 1M+' then 40
    when 'Not sure yet' then 15
    else 0
  end;
  v_score := v_score + case p_timeline
    when 'As soon as possible' then 20
    when 'Within 2 weeks' then 18
    when 'Within 1 month' then 15
    when '1-3 months' then 10
    when '3+ months' then 5
    when 'We''re exploring for now' then 2
    else 0
  end;
  v_score := v_score + case p_engagement_type
    when 'One-off project' then 5
    when 'Ongoing creative partnership' then 15
    when 'Monthly retainer' then 20
    when 'Not sure yet' then 5
    else 0
  end;
  -- Project-completeness bonus (concrete rule for the spec's "additional
  -- points for strong project completeness"):
  if length(trim(coalesce(p_current_problem, ''))) > 0 then v_score := v_score + 5; end if;
  if length(trim(coalesce(p_success_definition, ''))) > 0 then v_score := v_score + 5; end if;
  if jsonb_array_length(coalesce(p_files, '[]'::jsonb)) > 0 then v_score := v_score + 5; end if;
  if array_length(p_services, 1) >= 2 then v_score := v_score + 5; end if;
  v_score := least(v_score, 100);

  update public.consultations set lead_score = v_score where id = v_consultation_id;

  -- File metadata: files are already sitting in Storage (client uploaded
  -- before calling this function) — verify each path actually exists
  -- before trusting the client-supplied metadata.
  if p_files is not null then
    for v_file in select * from jsonb_array_elements(p_files) loop
      select name into v_verified_path
      from storage.objects
      where bucket_id = 'consultation-files'
        and name = (v_file ->> 'storage_path');

      if v_verified_path is not null then
        insert into public.consultation_files (consultation_id, storage_path, original_filename, mime_type, size_bytes)
        values (
          v_consultation_id,
          v_verified_path,
          v_file ->> 'original_filename',
          v_file ->> 'mime_type',
          nullif(v_file ->> 'size_bytes', '')::bigint
        );
      end if;
    end loop;
  end if;

  perform public.log_consultation_activity(v_consultation_id, 'submitted', 'Consultation submitted via /consultation form');

  return jsonb_build_object('id', v_consultation_id, 'reference', v_reference);
end;
$$;

revoke all on function public.submit_consultation(
  text, text, text, text, text, text, text, text, text[], text,
  text[], text[], text[], text[], text, text[], text, text, text,
  text[], text, text, text, text, text, text, text, text, boolean,
  jsonb, jsonb, text
) from public;

grant execute on function public.submit_consultation(
  text, text, text, text, text, text, text, text, text[], text,
  text[], text[], text[], text[], text, text[], text, text, text,
  text[], text, text, text, text, text, text, text, text, boolean,
  jsonb, jsonb, text
) to anon, authenticated;
