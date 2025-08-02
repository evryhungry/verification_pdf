package org.capsc.pdf.user.service;

import org.capsc.pdf.user.dto.UserRequestDto;
import org.capsc.pdf.user.entity.User;

import java.util.Optional;
import java.util.UUID;

public interface UserService {
    User createUser(UserRequestDto user);
    User updateUser(UUID id, UserRequestDto updatedUser);
    Optional<User> getUser(UUID id);
    void deleteUser(UUID id);
}