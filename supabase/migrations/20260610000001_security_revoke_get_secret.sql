-- Security fix (Tier 1, Fix A): lock down public.get_secret.
--
-- get_secret is SECURITY DEFINER and reads vault.decrypted_secrets. It had
-- EXECUTE granted to anon + authenticated, so any client with the public anon
-- key could read every vault secret via /rest/v1/rpc/get_secret.
--
-- Edge functions call get_secret through the service-role client (see
-- _shared/vaultClient.ts), and service_role bypasses GRANTs, so revoking anon +
-- authenticated does not affect them. The frontend never calls get_secret.
--
-- Verified: this function has NO PUBLIC grant in its ACL, so revoking anon +
-- authenticated is sufficient (no FROM PUBLIC needed here).

REVOKE EXECUTE ON FUNCTION public.get_secret(text) FROM anon, authenticated;
