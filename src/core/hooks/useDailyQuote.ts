import { useState, useEffect } from 'react';
import quotes from '../../quotes.json';

export const useDailyQuote = () => {
    const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);

    useEffect(() => {
        const storedIndex = localStorage.getItem('jee-tracker-quote-index');
        let index = storedIndex ? parseInt(storedIndex, 10) : 0;

        if (isNaN(index) || index >= quotes.length) {
            index = 0;
        }

        setDailyQuote(quotes[index]);

        const nextIndex = (index + 1) % quotes.length;
        localStorage.setItem('jee-tracker-quote-index', nextIndex.toString());
    }, []);

    return dailyQuote;
};
