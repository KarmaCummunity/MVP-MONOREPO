import { Body, Controller, Post } from "@nestjs/common";
import {
  UserAuthService,
  RegisterUserBody,
  LoginUserBody,
} from "../services/user-auth.service";

@Controller("api/users")
export class UsersAuthController {
  constructor(private readonly userAuthService: UserAuthService) {}

  @Post("register")
  async registerUser(@Body() userData: RegisterUserBody) {
    return this.userAuthService.registerUser(userData);
  }

  @Post("login")
  async loginUser(@Body() loginData: LoginUserBody) {
    return this.userAuthService.loginUser(loginData);
  }

  @Post("resolve-id")
  async resolveUserId(
    @Body() body: { firebase_uid?: string; google_id?: string; email?: string },
  ) {
    return this.userAuthService.resolveUserId(body);
  }
}
