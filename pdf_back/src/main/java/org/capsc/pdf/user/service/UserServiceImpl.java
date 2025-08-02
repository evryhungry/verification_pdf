package org.capsc.pdf.user.service;

import lombok.RequiredArgsConstructor;
import org.capsc.pdf.user.dto.UserRequestDto;
import org.capsc.pdf.user.entity.User;
import org.capsc.pdf.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public User createUser(UserRequestDto requestDto) {
        return userRepository.save(new User().userBuilder(requestDto));
    }

    @Override
    public User updateUser(UUID id, UserRequestDto updatedDto) {
        return userRepository.findById(id)
                .map(existing -> {
                    existing.setEmail(updatedDto.getEmail());
                    existing.setPassword(updatedDto.getPassword());
                    existing.setName(updatedDto.getName());
                    existing.setPosition(updatedDto.getPosition());
                    existing.setProfileImage(updatedDto.getProfileImage());
                    existing.setSignatureImageUrl(updatedDto.getSignatureImageUrl());
                    existing.setRole(User.Role.valueOf(updatedDto.getRole()));
                    return userRepository.save(existing);
                })
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
    }

    @Override
    public Optional<User> getUser(UUID id) {
        return userRepository.findById(id);
    }

    @Override
    public void deleteUser(UUID id) {
        userRepository.deleteById(id);
    }
}