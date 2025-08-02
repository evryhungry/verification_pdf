package org.capsc.pdf.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.capsc.pdf.common.entity.BaseTimeEntity;
import org.capsc.pdf.user.dto.UserRequestDto;

import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id; // UUID

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    private String position;

    private String profileImage;

    @Enumerated(EnumType.STRING)
    private Role role; // ADMIN, USER

    private String signatureImageUrl;

    public enum Role {
        ADMIN, USER
    }

    public User userBuilder(UserRequestDto userRequestDto) {
        return User.builder()
                .email(userRequestDto.getEmail())
                .password(userRequestDto.getPassword())
                .name(userRequestDto.getName())
                .position(userRequestDto.getPosition())
                .profileImage(userRequestDto.getProfileImage())
                .role(Role.valueOf(userRequestDto.getRole()))
                .signatureImageUrl(userRequestDto.getSignatureImageUrl())
                .build();
    }
}
