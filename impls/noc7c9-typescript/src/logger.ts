export default (...args: unknown[]) => {
    if (process.env.DEBUG !== 'true') {
        return;
    }
    console.error(...args);
};
