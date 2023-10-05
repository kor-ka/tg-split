export type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type Optional<T, K extends keyof T> = OmitUnion<T, K> & Partial<Pick<T, K>>