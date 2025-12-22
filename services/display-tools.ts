export function padToFullRows(data, columns) {
    if (data == null) return []
    const remainder = data.length % columns;
    if (remainder === 0) return data;

    const paddingCount = columns - remainder;
    return [
        ...data,
        ...Array.from({ length: paddingCount }).map(() => ({ __empty: true })),
    ];
}
