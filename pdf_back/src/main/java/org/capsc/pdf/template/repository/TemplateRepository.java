package org.capsc.pdf.template.repository;

import org.capsc.pdf.template.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TemplateRepository extends JpaRepository<Template, Long> {
    List<Template> findAllByUserid(UUID userId);
}