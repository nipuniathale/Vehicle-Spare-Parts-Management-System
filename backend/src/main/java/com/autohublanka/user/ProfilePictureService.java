package com.autohublanka.user;

import com.autohublanka.common.FileTypes;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.user.dto.UserResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Add, change and remove the logged-in user's profile picture (JPG, PNG, WEBP or GIF, max 2 MB). */
@Service
@Transactional
public class ProfilePictureService {

    public static final long MAX_BYTES = 2L * 1024 * 1024;

    private final ProfilePictureRepository repository;
    private final CurrentUser currentUser;

    public ProfilePictureService(ProfilePictureRepository repository, CurrentUser currentUser) {
        this.repository = repository;
        this.currentUser = currentUser;
    }

    /** Upload a new picture or replace the current one. */
    public UserResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Please choose an image");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException("The picture must be 2 MB or smaller");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("The picture could not be read. Please try again.");
        }
        String type = FileTypes.image(bytes);
        if (type == null) {
            throw new BusinessException("Only JPG, PNG, WEBP or GIF images can be used");
        }

        User user = currentUser.get();
        ProfilePicture picture = repository.findByUserId(user.getId()).orElseGet(ProfilePicture::new);
        picture.setUserId(user.getId());
        picture.setContentType(type);
        picture.setData(bytes);
        repository.save(picture);

        // the version number makes browsers load the new picture instead of a cached old one
        user.setProfileImageUrl("/api/users/" + user.getId() + "/avatar?v=" + System.currentTimeMillis());
        return UserResponse.from(user);
    }

    /** Remove the picture (initials are shown again). Also clears a Google picture. */
    public UserResponse remove() {
        User user = currentUser.get();
        if (user.getProfileImageUrl() == null) {
            throw new BusinessException("You don't have a profile picture");
        }
        repository.deleteByUserId(user.getId());
        user.setProfileImageUrl(null);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public ProfilePicture get(Long userId) {
        return repository.findByUserId(userId).orElseThrow(() -> NotFoundException.of("Profile picture", userId));
    }
}
