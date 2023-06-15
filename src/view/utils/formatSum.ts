export const formatSum = (sum: number, abs = true, k = true) => {
    let s = ((abs ? Math.abs(sum) : sum) / 100)

    if (k && (s >= 1000 && ((s / 100) % 1 === 0))) {
        s /= 1000
        return s + 'K'
    }
    return s.toString()
}
