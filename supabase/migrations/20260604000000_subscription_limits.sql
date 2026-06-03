-- Add billing_cycle_tours_used to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_cycle_tours_used integer NOT NULL DEFAULT 0;

-- Add has_been_published to tours
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS has_been_published boolean NOT NULL DEFAULT false;

-- Trigger function to enforce publishing limits and update count
CREATE OR REPLACE FUNCTION public.handle_tour_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_plan text;
  v_used int;
  v_limit int;
BEGIN
  -- If the tour is transitioning to/inserted as 'published' and has_been_published is false
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM 'published')) AND NOT COALESCE(NEW.has_been_published, false) THEN
    -- Get user plan and current usage
    SELECT plan, billing_cycle_tours_used INTO v_plan, v_used
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Map plan to limit (trial: 1, basic: 5, pro: 25, agency: 9999)
    IF v_plan = 'trial' THEN
      v_limit := 1;
    ELSIF v_plan = 'basic' THEN
      v_limit := 5;
    ELSIF v_plan = 'pro' THEN
      v_limit := 25;
    ELSE -- agency or other
      v_limit := 9999;
    END IF;

    -- Block if limit is exceeded
    IF v_used >= v_limit THEN
      RAISE EXCEPTION 'You have reached your subscription plan limit of % published tours for this billing cycle.', v_limit;
    END IF;

    -- Mark tour as having been published
    NEW.has_been_published := true;

    -- Increment the count in profiles
    UPDATE public.profiles
    SET billing_cycle_tours_used = billing_cycle_tours_used + 1
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS on_tour_status_change ON public.tours;
CREATE TRIGGER on_tour_status_change
  BEFORE INSERT OR UPDATE ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tour_status_change();

-- Notify postgrest to reload the schema cache
NOTIFY pgrst, 'reload schema';
