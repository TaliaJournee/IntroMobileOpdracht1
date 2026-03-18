interface Club {
    id: string;
    name: string;
    url: string;
    place: string;
    address: string;
}

interface Match {
    id: string;
    club: Club;
    name:string;
    date: string;
    takenSlots: number;
    totalSlots: number;
    genders: string;
}

export {Club, Match};
