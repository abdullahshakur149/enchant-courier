// helper.js
import { parseISO, format } from 'date-fns';

export const formatDate = (dateInput) => {
    try {
        const parsedDate = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
        if (isNaN(parsedDate)) return "Invalid Date";

        return format(parsedDate, 'dd/MM/yyyy hh:mm:ss a');
    } catch (error) {
        return "Invalid Date";
    }
};
