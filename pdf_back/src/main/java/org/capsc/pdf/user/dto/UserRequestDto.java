package org.capsc.pdf.user.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDto {
    private String email;
    private String password;
    private String name;
    private String position;
    private String profileImage;
    private String signatureImageUrl;
    private String role; // ADMIN or USER (enum name as String)
}