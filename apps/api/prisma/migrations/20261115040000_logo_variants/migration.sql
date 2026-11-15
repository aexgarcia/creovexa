-- Versión clara del logo e isotipo; los archivos van a organization_logo_assets.
ALTER TABLE "organizations"
  ADD COLUMN "dark_background_logo_asset_id" UUID,
  ADD COLUMN "icon_asset_id" UUID;
