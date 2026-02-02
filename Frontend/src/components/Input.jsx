import React from 'react';

const Input = ({
    label,
    error,
    icon: Icon,
    className = '',
    ...props
}) => {
    return (
        <div className={`flex flex-col gap-sm ${className}`}>
            {label && (
                <label className="text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    className={`input ${Icon ? 'pl-10' : ''} ${error ? 'border-red-500' : ''}`}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-red-400">{error}</span>
            )}
        </div>
    );
};

export default Input;
