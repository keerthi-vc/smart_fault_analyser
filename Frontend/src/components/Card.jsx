import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', glass = false, hover = true, ...props }) => {
    const baseClass = glass ? 'card-glass' : 'card';
    const hoverClass = hover ? '' : 'hover:transform-none hover:shadow-none';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`${baseClass} ${hoverClass} ${className}`}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default Card;
