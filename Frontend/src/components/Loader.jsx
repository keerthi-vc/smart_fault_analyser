import React from 'react';

const Loader = ({ size = 'sm', fullScreen = false, text = 'Loading...' }) => {
    const sizes = {
        xs: 'h-4 w-4',
        sm: 'h-8 w-8',
        md: 'h-12 w-12',
        lg: 'h-16 w-16'
    };

    const loader = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={`${sizes[size]} relative`}>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
            </div>
            {text && <div className="text-sm text-gray-400">{text}</div>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                {loader}
            </div>
        );
    }

    return loader;
};

export default Loader;
