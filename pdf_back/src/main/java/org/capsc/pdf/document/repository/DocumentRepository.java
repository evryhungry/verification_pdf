package org.capsc.pdf.document.repository;

import org.capsc.pdf.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, Long>
{
}
