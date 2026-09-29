-- Migration: Patient Dashboard Enhancements & Storage Bucket Setup
-- Timestamp: 20260929203000

-- 1. Garante que o bucket 'loan-documents' exista para envio de documentos dos pacientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas RLS para o bucket 'loan-documents'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload their own loan documents'
  ) THEN
    CREATE POLICY "Users can upload their own loan documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'loan-documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can view their own loan documents'
  ) THEN
    CREATE POLICY "Users can view their own loan documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'loan-documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete their own loan documents'
  ) THEN
    CREATE POLICY "Users can delete their own loan documents"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'loan-documents' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 3. Garante permissão RLS para atualização de perfil pelo próprio usuário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
