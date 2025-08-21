package com.hiswork.backend.service;

import com.hiswork.backend.domain.Template;
import com.hiswork.backend.domain.User;
import com.hiswork.backend.dto.TemplateCreateRequest;
import com.hiswork.backend.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class TemplateService {
    
    private final TemplateRepository templateRepository;
    
    public Template savePdfTemplate(Template template) {
        return templateRepository.save(template);
    }
    
    public List<Template> getAllTemplates() {
        return templateRepository.findAll();
    }
    
    public Optional<Template> getTemplateById(Long id) {
        return templateRepository.findById(id);
    }
    
    public Template updateTemplate(Long id, TemplateCreateRequest request, User user) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        
        // 생성자만 수정 가능
        if (!template.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException("템플릿을 수정할 권한이 없습니다");
        }
        
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setIsPublic(request.getIsPublic());
        template.setPdfFilePath(request.getPdfFilePath());
        template.setPdfImagePath(request.getPdfImagePath());
        
        return templateRepository.save(template);
    }
    
    public void deleteTemplate(Long id, User user) {
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        
        // 생성자만 삭제 가능
        if (!template.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException("템플릿을 삭제할 권한이 없습니다");
        }
        
        templateRepository.delete(template);
    }
} 