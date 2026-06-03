
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male','female','other')),
  photo_url TEXT,
  notes TEXT,
  gift_ideas TEXT,
  mother_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  father_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  is_self BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own people" ON public.people FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own people" ON public.people FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own people" ON public.people FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own people" ON public.people FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_people_user ON public.people(user_id);
CREATE INDEX idx_people_birthdate ON public.people(user_id, birthdate);

CREATE TABLE public.reminder_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  birthday_year INT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(person_id, birthday_year)
);

GRANT SELECT, INSERT ON public.reminder_log TO authenticated;
GRANT ALL ON public.reminder_log TO service_role;

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reminders" ON public.reminder_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER people_updated_at BEFORE UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
