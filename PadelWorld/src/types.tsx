export interface Club {
  id: string;
  name: string;
  url: string;
  place: string;
  address: string;
  province: string;
}

export interface Match {
  id: string;
  club: Club | null;
  name: string;
  date: string;
  takenSlots: number;
  totalSlots: number;
  genders: string;
}

export interface AppUserProfile {
  uid: string;
  skillLevel: number;
}