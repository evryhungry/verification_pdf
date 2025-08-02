package org.capsc.pdf.user.dto;

import lombok.*;
import org.capsc.pdf.user.entity.User;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDto {
    private UUID id;
    private String email;
    private String name;
    private String position;
    private String profileImage;
    private String signatureImageUrl;
    private String role;

    public static UserResponseDto of(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .position(user.getPosition())
                .profileImage(user.getProfileImage())
                .signatureImageUrl(user.getSignatureImageUrl())
                .role(user.getRole().name())
                .build();
    }
}