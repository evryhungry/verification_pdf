package org.capsc.pdf.user.controller;

import lombok.RequiredArgsConstructor;
import org.capsc.pdf.user.dto.UserRequestDto;
import org.capsc.pdf.user.dto.UserResponseDto;
import org.capsc.pdf.user.entity.User;
import org.capsc.pdf.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserResponseDto> createUser(@RequestBody UserRequestDto requestDto) {
        User createdUser = userService.createUser(requestDto);
        UserResponseDto response = convertToResponse(createdUser);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDto> updateUser(
            @PathVariable UUID id,
            @RequestBody UserRequestDto requestDto
    ) {
        User updated = userService.updateUser(id, requestDto);
        return ResponseEntity.ok(convertToResponse(updated));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDto> getUser(@PathVariable UUID id) {
        return userService.getUser(id)
                .map(user -> ResponseEntity.ok(convertToResponse(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // 매핑 메서드
    private UserResponseDto convertToResponse(User user) {
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