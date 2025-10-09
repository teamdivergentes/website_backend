export class UserFormDTO {
    email: string;
    password: string;
    role: UserRoleEnum;
}

export enum UserRoleEnum {
    ADMIN = 'ADMIN',
    COMMUNITY_MANAGER = 'COMMUNITY_MANAGER'
}