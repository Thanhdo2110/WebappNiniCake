export type ProfileSchemaT = {
  fullName: string;
  phone?: string;
  avatarUrl?: string | null;
};

export type AddressZod = {
  fullName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  isDefault?: boolean;
};
