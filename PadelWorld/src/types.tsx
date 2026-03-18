interface Club {
    name: string;
    url: string;
    place: string;
}

interface Match {
    club: Club;
    name:string;
    date: string;
    time: string;
    openSlots: number;
    totalSlots: number;
    genders: string;
}

export {Club, Match};
