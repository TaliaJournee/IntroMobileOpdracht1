interface Club {
    id: number;
    name: string;
    url: string;
    place: string;
}

interface Match {
    id: number;
    club: Club;
    name:string;
    date: string;
    time: string;
    openSlots: number;
    totalSlots: number;
    genders: string;
}

export {Club, Match};
