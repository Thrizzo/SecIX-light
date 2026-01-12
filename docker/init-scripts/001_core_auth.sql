-- GRC Platform Core Auth Schema
-- This script initializes the minimum schema required for self-hosted authentication

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth schema (mimics Supabase auth)
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    encrypted_password text NOT NULL,
    raw_user_meta_data jsonb DEFAULT '{}',
    raw_app_meta_data jsonb DEFAULT '{}',
    email_confirmed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'auditor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table (CRITICAL: roles stored separately for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    business_unit_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create business_units table (required by profiles foreign key)
CREATE TABLE IF NOT EXISTS public.business_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_security_org boolean DEFAULT false,
    manager_user_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add foreign key for profiles.business_unit_id if not exists
DO $$ BEGIN
    ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_business_unit_id_fkey 
        FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create helper function to check roles (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Grant basic permissions
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT SELECT ON auth.users TO PUBLIC;
GRANT ALL ON public.user_roles TO PUBLIC;
GRANT ALL ON public.profiles TO PUBLIC;
GRANT ALL ON public.business_units TO PUBLIC;

-- Log initialization
DO $$ BEGIN
    RAISE NOTICE 'GRC Platform core auth schema initialized successfully';
END $$;
